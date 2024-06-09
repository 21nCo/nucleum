define function fn::pointron::import($tags: any, $goals: any, $sessions: any, $logs: any, $fileName: string){
    let $import = array::first(create import set created = time::now(), app = 'pointron', source= 'self', fileName= $fileName);
    return fn::pointron::importChunk($tags, $goals, $sessions, $logs, $import.id);
};