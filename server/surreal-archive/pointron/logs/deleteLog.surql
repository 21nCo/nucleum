--Modified: DBCL-12 - mutationMap update
DEFINE FUNCTION fn::pointron::log::delete($id: record){
    delete from PointSession where id is $id;
    delete from PointLog where sessionId is $id;
    update kv:mutationMap merge {PointLog: time::unix(), PointSession: time::unix()};
};