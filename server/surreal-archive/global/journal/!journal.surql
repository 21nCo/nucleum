
--Deprecated - DBCL-14
define function fn::global::journal($context: string, $scale: string, $begin: number,$end: number){
    return if $context is 'pointron' {
        let $data = fn::pointron::journal($scale, $begin, $end);
        let $target = array::first(array::first(select value horizonTargets[WHERE scale is $scale].target from Preferences:pointron));
        return {data: $data, target: $target};
    }
};