DEFINE FUNCTION fn::pointron::script::08(){
    let $offset = array::first(select value timeZoneOffset from Preferences:global);
    return if $offset is none {
        return insert into tz {date: time::now() - 1y, offset: 0};
    } else {
        return insert into tz {date: time::now() - 1y, offset: $offset};
    };
};