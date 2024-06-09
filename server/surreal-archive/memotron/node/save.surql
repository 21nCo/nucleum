-- Modified DBCL-14 - avatar instead of icon
define function fn::memotron::node::save($node: any, $links: array){
    let $created = array::first(create node set title = $node.title, avatar = $node.avatar, body = $node.body, tzOffset = $node.tzOffset, type = $node.type, created = time::now(), createdBy = $node.createdBy, metadata= $node.metadata );
    return select fn::memotron::link($created.id, id, linkType) from $links;
};



-- Modifed: DBCL-13
define function fn::memotron::node::save($node: any, $links: array){
    let $created = array::first(create node set title = $node.title, icon = $node.icon, body = $node.body, tzOffset = $node.tzOffset, type = $node.type, created = time::now(), createdBy = $node.createdBy, metadata= $node.metadata );
    return select fn::memotron::link($created.id, id, linkType) from $links;
};