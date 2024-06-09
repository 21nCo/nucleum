DEFINE FUNCTION fn::pointron::log::fetch($id: record){
    return array::first(select id,start,end,logs, elapsed,blocks,tasks, notes,(select id, label,color,fn::pointron::goals::fetchParent(id) as parent from PointGoal where id in $parent.tasks.goalId) as goals from PointSession where id is $id);
};