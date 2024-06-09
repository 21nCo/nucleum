define function fn::pointron::export(){
    let $logs = select * from PointLog;
    let $sessions = select * from PointSession;
    let $goals = select * from PointGoal;
    let $tags = select * from PointTag;
    return {logs: $logs, sessions: $sessions, goals: $goals, tags: $tags}
};


define function fn::pointron::testimportexport(){
    let $export = return fn::pointron::export();
    let $testGoals =  select label, color, id as ogId from $export.goals;
    return fn::pointron::import($export.tags,$testGoals, $export.sessions, $export.logs,'testfile.json');
};