/**
 * Global dbo definitions used by the client apps.
 */
export const globalDbo = {
  "fn::global::resource::fetch": fetchResource()
};

export function userDatev4() {
  const definition = `DEFINE FUNCTION fn::user::time::date::v4($dateInUtc: datetime){
    let $offset = return fn::user::time::offset($dateInUtc);
    let $date = time::from::unix(time::unix($dateInUtc)  + $offset);
    let $hour = time::hour($date);
    let $minute = time::minute($date);
    let $userDayStart =  array::first(select dayStartHour as hour, 
    dayStartMinute as minute from kv:globalPreferences);
    return if $hour > $userDayStart.hour {
        return $date;
    } else if $hour is $userDayStart.hour and $minute > $userDayStart.minute {
        return $date;
    } else {
        return $date - 1d
    }
};`;
  return [...userTimeOffset(), definition];
}

function userTimeOffset() {
  const definition = `DEFINE FUNCTION fn::user::time::offset($dateInUtc: datetime){
    return array::first(select date, offset from tz WHERE date < $dateInUtc ORDER BY date DESC LIMIT 1).offset;
};`;
  return [definition];
}

export function resolveUrlPartsV2() {
  const def = `DEFINE FUNCTION fn::global::utils::resolveUrlParts::v2($url: string){
	let $host = parse::url::host($url);
	let $path = parse::url::path($url);
	let $query = parse::url::query($url);
	return {host: $host, path: $path, query: $query };
};`;
  return [def];
}

function fetchResource() {
  const def = `DEFINE function fn::global::resource::fetch($resource: string, $since: option<datetime>){
    let $records =  IF $since is not none then select * from type::table($resource) where modifiedAt > $since else select * from type::table($resource) end; 
    let $count = SELECT count() FROM ONLY type::table($resource) GROUP ALL LIMIT 1; 
    return {records: $records, totalCount: $count.count};
};`;
  return [def];
}
