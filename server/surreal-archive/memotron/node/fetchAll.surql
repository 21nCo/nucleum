-- Created: DBCL-13
define function fn::memotron::node::fetchAll(){
    return select *, (fn::memotron::node::forelinks($parent.id)) as forelinks from node;
};