
--Created - DBCL-14
DEFINE FUNCTION fn::pointron::goal::fetchQuickFocusItems::v2(){
  return select label, id, color, tags, isFavorite,
  fn::pointron::analytics::focusByCurrentHorizon::v3('DAYS',id).focus as focus, fn::pointron::goals::fetchParent(id) as parent from PointGoal 
  where isPinnedForQuickStart is true and 
  ((isArchived is false or isArchived is none) and fn::pointron::goals::isParentArchived(id) < 1);
}


-- Created - DBCL-12
DEFINE FUNCTION fn::pointron::goal::fetchQuickFocusItems(){
  return select label, id, color, tags, isFavorite,
  fn::pointron::analytics::focusByCurrentHorizon::v2('DAYS',id) as focus, fn::pointron::goals::fetchParent(id) as parent from PointGoal 
  where isPinnedForQuickStart is true and 
  ((isArchived is false or isArchived is none) and fn::pointron::goals::isParentArchived(id) < 1);
}


-- Deprecated - DBCL-12
DEFINE FUNCTION fn::pointron::goals::quickFocus::v2($isFavoritesOnly: bool, $tag: record)
{
  return select label, id, color, 
  fn::pointron::analytics::focusByCurrentHorizon::v2('DAYS',id) as focus, fn::pointron::goals::fetchParent(id) as parent from PointGoal 
  where isPinnedForQuickStart is true and 
  ((isArchived is false or isArchived is none) and fn::pointron::goals::isParentArchived(id) < 1) and 
  ( tags contains $tag or $tag is PointTag:none) and 
  ($isFavoritesOnly is false or isFavorite is true);
};


DEFINE FUNCTION fn::pointron::goals::quickFocus($isFavoritesOnly: bool, $tag: record)
{
  return select label, id, color, 
  fn::pointron::analytics::focusByCurrentHorizon('DAYS',id) as focus, fn::pointron::goals::fetchParent(id) as parent from PointGoal 
  where isPinnedForQuickStart is true and 
  ((isArchived is false or isArchived is none) and fn::pointron::goals::isParentArchived(id) < 1) and 
  ( tags contains $tag or $tag is PointTag:none) and 
  ($isFavoritesOnly is false or isFavorite is true);
};