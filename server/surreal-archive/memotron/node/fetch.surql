define function fn::memotron::node::fetch($id: record){
    return array::first(select *, (fn::memotron::node::forelinks($parent.id)) as forelinks from node where id is $id);
};