define function fn::pointron::revertImport($importId: record){
    delete from PointLog where importId = $importId;
    delete from PointGoal where importId = $importId;
    delete from PointSession where importId = $importId;
    delete from PointTag where importId = $importId;
    delete from import where id is $importId;
    return true;
};