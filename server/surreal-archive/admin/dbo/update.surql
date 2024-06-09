DEFINE FUNCTION fn::admin::dbo::update($id: string, $changeId: int, $definition: string) {
    LET $newHistoryItem = { changeId: $changeId, created: time::now(), definition: $definition };
    LET $current = array::first((SELECT * FROM dbo WHERE meta::id(id) = $id));
    RETURN ( UPDATE dbo MERGE { changeId: $changeId, definition: $definition, history: array::append($current.history, $newHistoryItem), lastModified: time::now() } WHERE meta::id(id) = $id);
};