DEFINE FUNCTION fn::pointron::logs::fetch::v2($date: datetime) {
    return select start, end, blocks, id,elapsed, notes,(select label,color, fn::pointron::goals::fetchParent(id) as parent from PointGoal where id in $parent.tasks.goalId) as goals from PointSession where id !=PointSession:session and time::group(fn::user::time::date::v3(start), 'day') is time::group($date, 'day')
};


DEFINE FUNCTION fn::pointron::logs::fetch($begin: datetime, $end: datetime) {
    return select start, end, blocks, id,elapsed, notes,(select label,color from PointGoal where id in $parent.tasks.goalId) as goals from PointSession where start >= $begin and start <= $end and id !=PointSession:session
};