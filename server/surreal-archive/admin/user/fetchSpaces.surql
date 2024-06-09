-- Created: DBCL-12
-- Modified: DBCL-13
DEFINE FUNCTION fn::admin::user::fetchSpaces($user: record){
    let $spaceRelations = return array::first(select ->member.* as spaces from $user).spaces;
    return select role, meta::id(out.id) as id, out.* as details from $spaceRelations;
};
