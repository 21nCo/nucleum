from botocore.exceptions import ClientError
from pydub import AudioSegment
from surrealHelper import performScopeQuery
import boto3
import logging
import json
import os
import whisper
import time
# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    print(event)
    if 'body' not in event:
        raise KeyError("The 'body' key is missing from the event")
    post_data = json.loads(event['body'])
    print(post_data)
    s3_url = post_data['s3Url']
    nodeId = post_data['nodeId']
    userId = post_data['userId']
    discard, required = s3_url.split('amazonaws.com/')
    bucket_name, key = required.split('/', 1)
    print(bucket_name, key)
    local_dir = '/tmp'
    tempFileName = "temp."+key.split('.')[1]
    local_file_name = os.path.join(local_dir, tempFileName)
    whisperModel = "./tiny.pt"
    query = f'UPDATE {nodeId} SET body.initTranscription=true'
    agent = {"db": userId}
    try:
        if (nodeId != "dummy"):
            performScopeQuery(query, agent)
        s3 = boto3.client('s3')
        s3.download_file(bucket_name, key, local_file_name)
        model = whisper.load_model(whisperModel)
        start_time = time.time()
        result = model.transcribe(local_file_name)
        end_time = time.time()
        transcriptionDuration_seconds = end_time-start_time
        pydubAudio = AudioSegment.from_file(local_file_name)
        hours, remainder = divmod(pydubAudio.duration_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        transcriptionhours, transcriptionremainder = divmod(
            transcriptionDuration_seconds, 3600)
        transcriptionminutes, transcriptionseconds = divmod(
            transcriptionremainder, 60)
        print(f"Audio Duration:{int(hours)}:{int(minutes)}:{int(seconds)}", f"Model:{whisperModel}",
              f"Transcription Duration:{int(transcriptionhours)}:{int(transcriptionminutes)}:{int(transcriptionseconds)}", "Result: ", result["text"])
        os.remove(local_file_name)
        query = f'UPDATE {nodeId} SET body.transcription="{result["text"]}",body.initTranscription=false'
        if (nodeId != "dummy"):
            performScopeQuery(query, agent)
            return {
                'statusCode': 200,
                "body": json.dumps({
                    "result": "Successfully Transcribed"
                }),
                "headers": {
                    "Content-Type": "application/json"
                }
            }
        return {
            'statusCode': 200,
            "body": json.dumps({
                "result": f'{result["text"]}'
            }),
            "headers": {
                "Content-Type": "application/json"
            }
        }

    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            error_message = f"Error: The object '{key}' does not exist in bucket '{bucket_name}'."
        elif e.response['Error']['Code'] == '403':
            error_message = f"Error: Access denied for object '{key}' in bucket '{bucket_name}'."
        elif e.response['Error']['Code'] == '400':
            error_message = f"Error: Bad request made to S3 for object '{key}' in bucket '{bucket_name}'."
        else:
            error_message = f"Error: {e.response['Error']['Message']}"

        logger.error(error_message)
        return {
            'statusCode': 500,
            'body': error_message
        }
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'body': f"Unexpected error: {str(e)}"
        }
