DEFINE FUNCTION fn::memotron::load() {
    LET $global = array::first(SELECT * FROM Preferences:global);
    LET $local = array::first(SELECT * FROM Preferences:memotron);
    RETURN { globalPreferences: $global, localPreferences: $local };
};
