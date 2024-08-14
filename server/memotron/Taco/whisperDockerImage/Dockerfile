FROM public.ecr.aws/lambda/python:3.11

# Copy requirements.txt
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install the specified packages
RUN pip install -r requirements.txt

RUN pip install requests
RUN pip install python-dotenv
#adding ffmpeg
COPY ffmpeg-7.0-amd64-static/* "${LAMBDA_TASK_ROOT}/ffmpeg/"

# Copy all files in ./src
COPY src/* ${LAMBDA_TASK_ROOT}

ENV PATH="${LAMBDA_TASK_ROOT}/ffmpeg/:${PATH}"

# Set the CMD to your handler.
CMD [ "main.lambda_handler" ]