DEFINE FUNCTION fn::user::time::offset($dateInUtc: datetime){
    return array::first(select date, offset from tz WHERE date < $dateInUtc ORDER BY date DESC LIMIT 1).offset;
};