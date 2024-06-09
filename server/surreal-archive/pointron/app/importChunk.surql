define function fn::pointron::importChunk($tags: any, $goals: any, $sessions: any, $logs: any, $importId: record){
    let $insertedTags = insert into PointTag select *, $importId as importId from $tags;
    let $insertedGoals = insert into PointGoal select *, $importId as importId from $goals;
    let $insertedSessions = insert into PointSession select *, $importId as importId from $sessions;
    let $insertedLogs = insert into PointLog select *, $importId as importId from $logs;
    return {importId: $importId, insertedTags: $insertedTags, insertedGoals: $insertedGoals, insertedSessions: $insertedSessions, insertedLogs: $insertedLogs}
};