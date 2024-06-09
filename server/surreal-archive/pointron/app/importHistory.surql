define function fn::pointron::importHistory(){
    return select *, meta::id(id) as id from import where app is 'pointron';
};