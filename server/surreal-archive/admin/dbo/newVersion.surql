DEFINE FUNCTION fn::admin::dbo::newVersion($id: string, $changeId: int, $definition: string){
    let $current = array::first(select * from dbo where meta::id(id) contains $id order by version desc limit 1);
    update dbo set isObsolete = true where meta::id(id) contains $id;
    let $newVersionId = string::concat($id, "::v", type::string($current.version + 1));
    return fn::admin::dbo::create(
    $newVersionId, 
    $current.app, 
    $changeId, 
    $definition,
    $current.sub,
    $current.version + 1
    );
};