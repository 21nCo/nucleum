-- Created: DBCL-12
DEFINE FUNCTION fn::global::mergeMutationMap($map: any){
    let $current = array::first(select * from kv:mutationMap);
    update kv:mutationMap merge $map;
    update kv:mutationMap merge $current;
};