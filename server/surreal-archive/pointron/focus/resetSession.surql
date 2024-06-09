-- Created: DBCL-14
DEFINE FUNCTION fn::pointron::focus::reset::v4() {
    update kv:pointSessionFocusItems merge {items:[], modifiedAt: time::unix()};
    update kv:pointSessionSnapshot merge {snapshot: {}, state:0,currentSessionId:0,isSessionRunning:false, modifiedAt: time::unix()};
    let $todayFocus = fn::pointron::analytics::focusByCurrentHorizon::v3('DAYS');
    return {todayFocus: $todayFocus, streak: 0}
};

-- Created: DBCL-12
DEFINE FUNCTION fn::pointron::focus::reset::v3() {
    update kv:pointSessionFocusItems merge {items:[], modifiedAt: time::unix()};
    update kv:pointSessionSnapshot merge {snapshot: {}, state:0,currentSessionId:0,isSessionRunning:false, modifiedAt: time::unix()};
    let $todayFocus = fn::pointron::analytics::focusByCurrentHorizon::v2('DAYS', PointGoal:none);
    return {todayFocus: $todayFocus, streak: 0}
};

DEFINE FUNCTION fn::pointron::focus::reset::v2() {
    update PointSession:session content {};
    let $todayFocus = fn::pointron::analytics::focusByCurrentHorizon::v2('DAYS', PointGoal:none);
    return {todayFocus: $todayFocus, streak: 0}
};

DEFINE FUNCTION fn::pointron::focus::reset() {
    update PointSession:session content {};
    let $todayFocus = fn::pointron::analytics::focusByCurrentHorizon('DAYS', PointGoal:none);
    return {todayFocus: $todayFocus, streak: 0}
};