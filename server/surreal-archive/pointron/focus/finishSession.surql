--Created: DBCL-14
DEFINE FUNCTION fn::pointron::focus::finish::v4($sessionn: any, $logs: array, $snapshot: any) {
    create PointSession content $sessionn;
    insert into PointLog $logs;
    update kv:pointSessionFocusItems merge {items:[], modifiedAt: time::unix()};
    update kv:pointSessionSnapshot merge {snapshot: $snapshot, modifiedAt: time::unix()};
    update kv:mutationMap merge {PointLog: time::unix(), PointSession: time::unix()};
    let $todayFocus = fn::pointron::analytics::focusByCurrentHorizon::v3('DAYS');
    return {todayFocus: $todayFocus, streak: 0}
};



--Created: DBCL-12
DEFINE FUNCTION fn::pointron::focus::finish::v3($sessionn: any, $logs: array, $snapshot: any) {
    create PointSession content $sessionn;
    insert into PointLog $logs;
    update kv:pointSessionFocusItems merge {items:[], modifiedAt: time::unix()};
    update kv:pointSessionSnapshot merge {snapshot: $snapshot, modifiedAt: time::unix()};
    update kv:mutationMap merge {PointLog: time::unix(), PointSession: time::unix()};
    let $todayFocus = fn::pointron::analytics::focusByCurrentHorizon::v2('DAYS', PointGoal:none);
    return {todayFocus: $todayFocus, streak: 0}
};

DEFINE FUNCTION fn::pointron::focus::finish::v2($sessionn: any, $logs: array, $snapshot: any) {
    create PointSession content $sessionn;
    insert into PointLog $logs;
    update PointSession:session merge {snapshot: $snapshot, focusItems: []};
    let $todayFocus = fn::pointron::analytics::focusByCurrentHorizon::v2('DAYS', PointGoal:none);
    return {todayFocus: $todayFocus, streak: 0}
};


DEFINE FUNCTION fn::pointron::focus::finish($sessionn: any, $logs: array, $snapshot: any) {
    create PointSession content $sessionn;
    insert into PointLog $logs;
    update PointSession:session merge {snapshot: $snapshot, focusItems: []};
    let $todayFocus = fn::pointron::analytics::focusByCurrentHorizon('DAYS', PointGoal:none);
    return {todayFocus: $todayFocus, streak: 0}
};