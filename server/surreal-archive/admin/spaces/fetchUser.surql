DEFINE FUNCTION fn::admin::space::fetchUser($space: record, $user: record){
    let $relation = array::first(array::first(select <-member[where in is $user] as relation from $space).relation);
    let $user = return array::first(array::first(select <-member<-user[where id is $user] as member from $space).member);
    return {relation: $relation, user: $user};
};
