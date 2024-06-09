--Deprecated - DBCL-14 - local caching implementation - combined queries from client
DEFINE FUNCTION fn::pointron::load::v2($isIncludeFocus: bool) {
    LET $global = array::first(SELECT * FROM Preferences:global);
    LET $local = array::first(SELECT * FROM Preferences:pointron);
    LET $tags = SELECT * from PointTag;
    return if $isIncludeFocus is false {
    RETURN { globalPreferences: $global, localPreferences: $local, tags: $tags };
    } else {
        let $focus = fn::pointron::focus::sync::v2();
    RETURN { globalPreferences: $global, localPreferences: $local, focus:  $focus, tags: $tags};
    }
};


DEFINE FUNCTION fn::pointron::load($isIncludeFocus: bool) {
    LET $global = array::first(SELECT * FROM Preferences:global);
    LET $local = array::first(SELECT * FROM Preferences:pointron);
    LET $tags = SELECT * from PointTag;
    return if $isIncludeFocus is false {
    RETURN { globalPreferences: $global, localPreferences: $local, tags: $tags };
    } else {
        let $focus = fn::pointron::focus::sync();
    RETURN { globalPreferences: $global, localPreferences: $local, focus:  $focus, tags: $tags};
    }
};