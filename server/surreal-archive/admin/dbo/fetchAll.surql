-- Modified: DBCL-13
DEFINE FUNCTION fn::admin::dbo::fetchAll($subAtom: string, $lastRunChangeId: int){
    return select meta::id(id) as id,app,changeId,definition, priority, type from dbo where (app is "global" or app is $subAtom or $subAtom is 'gathery') and isObsolete is not true and (changeId >  $lastRunChangeId) order by priority desc;
};