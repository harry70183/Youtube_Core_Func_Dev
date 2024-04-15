import express from 'express';
import { 
    uploadProcessedVideo,
    downloadRawVideo,
    deleteRawVideo,
    deleteProcessedVideo,
    convertVideo,
    setupDirectories
  } from './storage'

  // Create the local directories for videos
  setupDirectories();

const app = express();
app.use(express.json());

// process a video from GCS into 1080p
app.post('/process-video', async (req, res) => {
    
    // Message Queue
    // Get the bucket and filename from the cloud Pub/Sub message
    let data;
    try{
        const message = Buffer.from(req.body.message.data, 'base64').toString('utf8');
        data = JSON.parse(message);
        if (!data.name){
            throw new Error('Invalid message payload received.');
        }
    } catch (error) {
        console.error(error);
        return res.status(400).send('Bad Request: missing filename.')
    }

    const inputFileName = data.name;
    const outputFileName = `processed-${inputFileName}`;

    // Download the raw video from GCS 
    await downloadRawVideo(inputFileName);

    // Process the video into 1080p
    try{
        await convertVideo(inputFileName, outputFileName);
    } catch (err){
        await Promise.all([
            deleteRawVideo(inputFileName),
            deleteProcessedVideo(outputFileName)
        ]); // Parallel Processing
        return res.status(500).send('Processing Failed');
    }

    // Upload the processed video to GCS
    await uploadProcessedVideo(outputFileName);

    await Promise.all([
        deleteRawVideo(inputFileName),
        deleteProcessedVideo(outputFileName)
    ]);

    return res.status(200).send('Processing Done');   
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on ${port}`); // use `` to define string and ${}
});