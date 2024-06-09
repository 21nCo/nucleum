DEFINE FUNCTION fn::memotron::node::forelinks($id: record){
    let $links = array::first(select value ->link.* from $id);
    return select out.title as title,out.icon as icon, out.id as id, toType,linkType from $links;
};