DEFINE FUNCTION fn::pointron::goals::fetchParent($id: record){
return array::first(select (select label,id from parent.*) as hierarchy, array::first(parent).color as color from PointGoal where id = $id);
};