-- Created - DBCL-12
DEFINE FUNCTION fn::global::script::12(){
    insert into kv select *,string::concat(meta::id(id),'Preferences') as id, time::unix() as modifiedAt from Preferences;
    insert into kv {
        id: 'mutationMap',
        modifiedAt: time::unix(),
        dataType: 'KVO'
    };
    let $sessionDetails = array::first(select * from PointSession:session);
    insert into kv [{id: 'pointFocusItems', items: $sessionDetails.focusItems, modifiedAt: time::unix(),
        dataType: 'KVO' }, {id: 'pointSessionSnapshot', snapshot: $sessionDetails.snapshot, modifiedAt: time::unix(),
        dataType: 'KVO' }];
}