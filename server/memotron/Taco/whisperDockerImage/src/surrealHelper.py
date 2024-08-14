import os
import requests
import json
from base64 import b64encode
from enum import Enum
from dotenv import load_dotenv

load_dotenv()

CONTEXT = {
    "ADMIN": "ADMIN",
    "USER": "USER",
    "SPACE": "SPACE"}


def performQuery(body):
    headers = {
        "Content-Type": "text/plain",
        "Authorization": "Basic " + os.getenv('VITE_AUTH'),
        "Accept": "application/json",
        "NS": os.getenv('USER_NS', ''),
        "DB": os.getenv('SURREAL_USER_DB', ''),
    }
    response = requests.post(os.getenv('VITE_BACKEND'),
                             headers=headers, data=json.dumps(body))
    print({"body": body, "response": response.json()})
    return response.json()


def performRootQuery(params):
    headers = {
        "Content-Type": "text/plain",
        "Authorization": "Basic " + b64encode((os.getenv('DB_USER') + ":" + os.getenv('DB_PASS')).encode()).decode(),
        "Accept": "application/json",
        "NS": os.getenv('ADMIN_NS', 'ADMIN') if params['dbType'] == CONTEXT['ADMIN'] else os.getenv('USER_NS', 'USER') if params['dbType'] == CONTEXT['USER'] else os.getenv('SPACE_NS', 'SPACE'),
        "DB": os.getenv('ADMIN_DB', 'ADMIN') if params['dbType'] == CONTEXT['ADMIN'] else params['db'],
    }
    body = params['query']
    print("performing root query:", {
        "body": body,
        "headers": headers,
    })
    end_point = os.getenv('DB_INSTANCE') + "/sql"
    response = requests.post(end_point, headers=headers, data=body)
    print({"endPoint": end_point, "response": response.json()})
    return response.json()


def performAdminQuery(query):
    return performRootQuery({"query": query, "dbType": CONTEXT['ADMIN']})


def performScopeQuery(query, agent):
    db_type = CONTEXT['USER']
    if 'context' in agent:
        db_type = agent['context']
    return performRootQuery({
        "query": query,
        "dbType": db_type,
        "db": agent['db'],
    })
