
-- Created: DBCL-12
-- Modified: DBCL-13
DEFINE FUNCTION fn::admin::space::create($label: string, $user: record){
    let $space = create space content {label: $label, createdAt: time::unix()};
    RELATE $user->member->$space content {role:'admin'};
    return $space;
}