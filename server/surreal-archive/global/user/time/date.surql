DEFINE FUNCTION fn::user::time::date::v3($dateInUtc: datetime){
    let $offset = return fn::user::time::offset($dateInUtc);
    let $date = time::from::unix(time::unix($dateInUtc)  + $offset);
    let $hour = time::hour($date);
    let $minute = time::minute($date);
    let $userDayStart =  array::first(select dayStartHour as hour, dayStartMinute as minute from Preferences:global);
    return if $hour > $userDayStart.hour {
        return $date;
    } else if $hour is $userDayStart.hour and $minute > $userDayStart.minute {
        return $date;
    } else {
        return $date - 1d
    }
};


DEFINE FUNCTION fn::user::time::date::v2($dateInUtc: datetime, $offset: int){
    let $date = time::from::unix(time::unix($dateInUtc)  + $offset);
    let $hour = time::hour($date);
    let $minute = time::minute($date);
    let $userDayStart =  array::first(select dayStartHour as hour, dayStartMinute as minute from Preferences:global);
    return if $hour > $userDayStart.hour {
        return $date;
    } else if $hour is $userDayStart.hour and $minute > $userDayStart.minute {
        return $date;
    } else {
        return $date - 1d
    }
};


DEFINE FUNCTION fn::user::time::date($dateInUtc: datetime){
    let $date = fn::user::time::convertToUserTimeZone($dateInUtc);
    let $hour = time::hour($date);
    let $minute = time::minute($date);
    let $userDayStart =  array::first(select dayStartHour as hour, dayStartMinute as minute from Preferences:global);
    return if $hour > $userDayStart.hour {
        return $date;
    } else if $hour is $userDayStart.hour and $minute > $userDayStart.minute {
        return $date;
    } else {
        return $date - 1d
    }
};