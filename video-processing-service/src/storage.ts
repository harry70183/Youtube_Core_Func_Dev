import { Storage } from '@google-cloud/storage';
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg';
import { resolve } from 'path';
import { dir } from 'console';

const storage = new Storage();
const rawVideoBucketName = 'harry70183-yt-raw-videos';
const processedVideoBucketName = 'harry70183-yt-processed-videos';

const localRawVideoPath = "./raw-videos";
const localProcessedVideoPath = './processed-videos'; 

/**
 * Creates the local directories for raw and processed videos.
 */
export function setupDirectories(){
    isDirectoryExist(localRawVideoPath);
    isDirectoryExist(localProcessedVideoPath);
}

/**
 * @param rawVideoName - The name of the file to convert from {@link localRawVideoPath}
 * @param processedVideoName - The name of the file to convert to {@link localProcessedVideoPath}
 * @returns A promise that resolves when the video has been converted
 */
export function convertVideo(rawVideoName: string, processedVideoName: string){
    return new Promise<void>((resovle, reject) => {
        // Create an ffmpeg
        ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
        .outputOptions('-vf', 'scale=-1:1080') // -vf -> video filter, scale=-1:1080 -> scale video width to 1080 height, -1: auto scale
        .on('end', function() {
            console.log("Video Processed Successfully");
            resolve();
        })
        .on('error', function(err:any){
            console.log(`Error found: ${err.message}`);
            reject(err);
        })
        .save(`${localProcessedVideoPath}/${processedVideoName}`);
    })
}

/**
 * @param fileName - The name of the file to download from.
 * {@link rawVideoBucketName} - bucket into the {@link localRawVideoPath} folder.
 * @returns A promise that resovles when the file has been downloaded.
 */
export async function downloadRawVideo(fileName: string){
    await storage.bucket(rawVideoBucketName)
        .file(fileName)
        .download({destination: `${localRawVideoPath}/${fileName}`});
    
    console.log(
        `gs://${rawVideoBucketName}/${fileName} downloaded to ${localRawVideoPath}/${fileName}.`
    );
}

/**
 * @param fileName - The name of the file to upload from.
 * {@link localProcessedVideoPath} - folder into the {@link processedVideoBucketName} bucket.
 * @returns A promise that resovles when the file has been uploaded.
 */
export async function uploadProcessedVideo(fileName: string){
    const bucket = storage.bucket(processedVideoBucketName);

    // Upload video to the bucket
    await storage.bucket(processedVideoBucketName)
    .upload(`${localProcessedVideoPath}/${fileName}`, {
        destination: fileName,
    });
    console.log(
    `${localProcessedVideoPath}/${fileName} uploaded to gs://${processedVideoBucketName}/${fileName}.`
    );

    // Set the video to be publicly readable
    await bucket.file(fileName).makePublic();
}

/**
 * @param fileName - The name of the file to delete
 * {@link localRawVideoPath} folder.
 * @returns A promise that resolves when the file has been deleted.
 */
export function deleteRawVideo(fileName: string){
    return deleteFile(`${localRawVideoPath}/${fileName}`);
}

/**
 * @param fileName - The name of the file to delete
 * {@link localProcessedVideoPath} folder.
 * @returns A promise that resolves when the file has been deleted.
 */
export function deleteProcessedVideo(fileName: string){
    return deleteFile(`${localProcessedVideoPath}/${fileName}`);
}

/**
 * @param filePath - The path of the file to delete.
 * @returns A promise that resolves when the file has been deleted.
 */
function deleteFile(filePath: string): Promise<void>{
    return new Promise((resolve, reject) => {
      if (fs.existsSync(filePath)){
        fs.unlink(filePath, (err) =>{
            if (err){
                console.log(`Failed to delete file at ${filePath}`, JSON.stringify(err));
                reject(err);
            }
            else{
                console.log(`File deleted at ${filePath}`);
                resolve();
            }
        });
      }
      else {
        console.log(`File not found at ${filePath}, skipping delete.`);
        resolve();
      }
    });
}

/**
 * Ensure the directory exists, creating it if necessary.
 * @param {string} dirPath - The directory path to check
 */
function isDirectoryExist(dirPath: string){
    if (!fs.existsSync(dirPath)){
        fs.mkdirSync(dirPath, { recursive: true }); // recursive: true enables creating nested directories
    }
    console.log(`Directory created at ${dirPath}`);
}