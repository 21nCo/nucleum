DEFINE FUNCTION fn::pointron::goals::isParentArchived($id: record){
return array::first(select value count(parent.isArchived) from $id)
};


DEFINE FUNCTION fn::pointron::goals::isParentArchived($id: record){ return array::first(select value count(parent.isArchived) from $id) };