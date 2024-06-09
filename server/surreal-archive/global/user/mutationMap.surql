-- Created - DBCL-12
DEFINE FUNCTION fn::global::fetchMutationMap(){
    let $recordData = array::first(select * from kv:mutationMap);
    let $objectMutationMap = select meta::id(id) as id, modifiedAt from kv;
    return {forRecords: $recordData, forObjects: $objectMutationMap};
}