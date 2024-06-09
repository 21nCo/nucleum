DEFINE FUNCTION fn::user::time::now(){
  let $offset = array::first((select value timeZoneOffset from Preferences:global));
  return fn::user::time::date::v2(time::now(), $offset);
};