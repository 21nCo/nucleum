-- Example
fn::admin::dbo::create(
    "fn::memotron::curation::createtest", 
    "memotron", 
    44, 
    "DEFINE FUNCTION fn::memotron::curation::create($curation: any){};", 
    "curation"
    )


-- Definition
DEFINE FUNCTION fn::admin::dbo::create($id: string, $app: string, $changeId: int, $definition: string,$sub: option<string>, $version: option<int>){
    let $type = RETURN IF string::contains(string::lowercase($definition), "::script::") {
        return "script";
    } else if string::contains(string::lowercase($definition), "define function") {
        return "fn";
    } else if string::contains(string::lowercase($definition), "define table") {
        return "table";
    };
    let $version = return if $version is none { return 1 } else {return $version};
    return create dbo content {id: $id, app: $app, changeId: $changeId, definition: $definition, history: [{
        changeId: $changeId,
        definition: $definition,
        created: time::now(),
    }],
    created: time::now(),
    isObsolete: false,
    lastModified: time::now(),
    version: $version,
    sub: $sub,
    type: $type
    };
};
