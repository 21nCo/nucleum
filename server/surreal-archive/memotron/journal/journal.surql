--Created DBCL-14 - Merging fn::global::journal::daily, fn::global::journal
--  TODO - scale
define function fn::memotron::journal::fetch($scale: string, $begin: datetime,$end: datetime){
    return select entries as value, created as date from nodesByDay where created >= $begin and created <= $end;
};
