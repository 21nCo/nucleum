--Deprecated: DBCL-12 - sync is being handled by the client - data Manager - kv:pointSessionSnapshot, kv:pointSessionFocusItems
DEFINE FUNCTION fn::pointron::focus::sync::v2() {
    LET $sessionn = array::first(SELECT * FROM PointSession:session);
    let $todayFocus = fn::pointron::analytics::focusByCurrentHorizon::v2('DAYS',PointGoal:none);
    RETURN { session: $sessionn,todayFocus: $todayFocus, streak: 0 };
};



DEFINE FUNCTION fn::pointron::focus::sync() {
    LET $sessionn = array::first(SELECT * FROM PointSession:session);
    let $todayFocus = fn::pointron::analytics::focusByCurrentHorizon('DAYS',PointGoal:none);
    RETURN { session: $sessionn,todayFocus: $todayFocus, streak: 0 };
};