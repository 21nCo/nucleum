

-- Created - DBCL-12
DEFINE FUNCTION fn::pointron::goal::fetchAll(){
    let $goalsInitial = select label,id, isFavorite, tags, isArchived, color,fn::pointron::goals::fetchParent(id) as parent, fn::pointron::goals::fetchSubGoals(id, true) as subGoals from PointGoal;
    return select *, count(subGoals) as subGoalCount from $goalsInitial;
}



-- Deprecated - DBCL-12
DEFINE FUNCTION fn::pointron::goals::fetchAll($isTopLevelGoalsOnly: bool, $isArchived: bool, $isFavoritesOnly: bool, $tag: record, $searchString: string){
RETURN {
    let $goalsInitial = select label,id, color,fn::pointron::goals::fetchParent(id) as parent, fn::pointron::goals::fetchSubGoals(id, false) as subGoals from PointGoal where (($isTopLevelGoalsOnly is true and (parent is none or array::len(parent) < 1)) or $isTopLevelGoalsOnly is false) and (($isArchived is true and isArchived is true) or ($isArchived is false and ((isArchived is false or isArchived is none) and fn::pointron::goals::isParentArchived(id) < 1))) and ($isFavoritesOnly is false or isFavorite is true) and ( tags contains $tag or $tag is PointTag:none) and (string::lowercase(label) CONTAINS string::lowercase($searchString) or string::len($searchString) is 0);
    let $goals = select *, count(subGoals) as subGoalCount from $goalsInitial;
    let $archivedCount = math::sum(select value count() from PointGoal where (parent is none or array::len(parent) < 1) and isArchived is true);
    return {goals: $goals, archivedCount: $archivedCount};
}
};


DEFINE FUNCTION fn::pointron::goals::fetchAll($isTopLevelGoalsOnly: bool, $isArchived: bool, $isFavoritesOnly: bool, $tag: record, $searchString: string){ RETURN { let $goalsInitial = select label,id, color,fn::pointron::goals::fetchParent(id) as parent, fn::pointron::goals::fetchSubGoals(id, false) as subGoals from PointGoal where (($isTopLevelGoalsOnly is true and (parent is none or array::len(parent) < 1)) or $isTopLevelGoalsOnly is false) and (($isArchived is true and isArchived is true) or ($isArchived is false and ((isArchived is false or isArchived is none) and fn::pointron::goals::isParentArchived(id) < 1))) and ($isFavoritesOnly is false or isFavorite is true) and ( tags contains $tag or $tag is PointTag:none) and (string::lowercase(label) CONTAINS string::lowercase($searchString) or string::len($searchString) is 0); let $goals = select *, count(subGoals) as subGoalCount from $goalsInitial; let $archivedCount = math::sum(select value count() from PointGoal where (parent is none or array::len(parent) < 1) and isArchived is true); return {goals: $goals, archivedCount: $archivedCount}; } };