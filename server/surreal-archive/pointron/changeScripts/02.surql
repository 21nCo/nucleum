DEFINE FUNCTION fn::pointron::script::02(){
    let $offset = array::first(select value timeZoneOffset from Preferences:global);
    if $offset is none {
        update PointLog set tzOffset = 0;
    } else {
        update PointLog set tzOffset = $offset;
    };
    let $targets = array::first(select value horizonTargets from Preferences:pointron);
    IF $targets is none or array::len($targets) < 1 {
      update PointLog set targets = NONE;
    } ELSE {
      update PointLog set targets = $targets;
    };
    fn::pointron::insertEmpty([{"val":24},{"val":32},{"val":64},{"val":366},{"val":740}]);
}