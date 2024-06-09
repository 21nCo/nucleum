
--Created DBCL-14 - Merging fn::global::journal::daily, fn::global::journal and fn::pointron::journal
define function fn::pointron::journal::fetch($scale: string, $begin: datetime,$end: datetime){
    return if $scale is 'DAYS' {
        return select fn::pointron::analytics::totalFocus(totalFocus, totalBreak) as value, fn::pointron::analytics::resolveTarget::v2($scale,start) as target, start as date from PointAggFocusByDay where start >= $begin and start <= $end;
    } else if $scale is 'MONTHS' { 
        return select totalFocus as value, string::concat(year,'-',month) as month from PointAggFocusByMonth where year >= $begin and year <= $end;
    } else {
        return select totalFocus as value, year from PointAggFocusByYear where year >= $begin and year <= $end;
    }
};


--Deprecated - DBCL-14
define function fn::pointron::journal($scale: string, $begin: number, $end: number){
    return if $scale is 'MONTHS' { 
        return select totalFocus as value, string::concat(year,'-',month) as month from PointAggFocusByMonth where year >= $begin and year <= $end;
    } else {
        return select totalFocus as value, year from PointAggFocusByYear where year >= $begin and year <= $end;
    }
}