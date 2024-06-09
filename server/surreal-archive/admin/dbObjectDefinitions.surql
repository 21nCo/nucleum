
-- Deprecated - use fn::admin::fetchDbObjects
DEFINE FUNCTION fn::admin::dbObjectDefinitions($subAtom: string, $isIncludeTables: bool){
    let $global = select value definition from dbObject where app = "global" and type is "fn";
    let $subatom = select value definition from dbObject where app = $subAtom and type is "fn";
    return if $isIncludeTables is true {
        let $globalTables = select value definition from dbObject where app = "global" and type is "table";
        let $subatomTables = select value definition from dbObject where app = $subAtom and type is "table";
        return array::flatten([$globalTables, $subatomTables, $global, $subatom ])
    } else {
        return array::flatten([$global, $subatom ])
    }
};