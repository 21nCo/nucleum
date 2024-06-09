DEFINE FUNCTION fn::memotron::timeline($day: datetime) {
    return select value fn::memotron::node::fetch(id) from node where time::day(fn::user::time::date::v3(created)) is time::day($day);
};