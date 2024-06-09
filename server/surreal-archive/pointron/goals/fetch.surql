--Created: DBCL-12 -- goals::fetch to goal::fetch
DEFINE FUNCTION fn::pointron::goal::fetch($id: record){
    let $raw = select id, *, fn::pointron::goals::fetchParent(id) as parent from PointGoal where id == $id;
    let $subGoals = fn::pointron::goals::fetchSubGoals($id, true);
    return array::first(select *, $subGoals as subGoals, count(select * from $subGoals where isArchived = true) as archivedSubGoalCount, count(select * from $subGoals where isArchived = false) as subGoalCount from $raw);
};

DEFINE FUNCTION fn::pointron::goals::fetch($id: record){
    let $raw = select id, *, fn::pointron::goals::fetchParent(id) as parent from PointGoal where id == $id;
    let $subGoals = fn::pointron::goals::fetchSubGoals($id, true);
    return array::first(select *, $subGoals as subGoals, count(select * from $subGoals where isArchived = true) as archivedSubGoalCount, count(select * from $subGoals where isArchived = false) as subGoalCount from $raw);
};