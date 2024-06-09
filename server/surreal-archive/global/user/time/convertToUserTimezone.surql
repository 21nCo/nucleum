DEFINE FUNCTION fn::user::time::convertToUserTimeZone($dtInUtc: datetime)
{    
    let $offset = array::first((select value timeZoneOffset from Preferences:global));
    if $offset is none {
        update Preferences:global merge { "timeZoneOffset": 18000}
    };
    return time::from::unix(time::unix($dtInUtc)  + array::first((select value timeZoneOffset from Preferences:global)));
};
