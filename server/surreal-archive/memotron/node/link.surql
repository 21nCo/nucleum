define function fn::memotron::link($from: record, $to: record, $linkType: option<string>){
    relate $from->link->$to content {toType: meta::tb($to), linkType: $linkType, created: time::now()}
};