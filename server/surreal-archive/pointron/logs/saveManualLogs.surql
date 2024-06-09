--Modified: DBCL-12 - mutationMap update
DEFINE FUNCTION fn::pointron::focus::saveManualLogs($sessions: any, $logs: array) {
    insert into PointSession $sessions;
    insert into PointLog $logs;
    update kv:mutationMap merge {PointLog: time::unix(), PointSession: time::unix()};
};