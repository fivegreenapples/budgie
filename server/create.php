<?php

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
	header("HTTP/1.0 405 Method Not Allowed");
	echo "Only POST is accepted.";
	exit();
}

$DATA = file_get_contents("php://input");
if (empty($DATA))
{
	header("HTTP/1.0 400 Bad Request");
	echo "No data found.";
	exit();
}

$DECODED = json_decode($DATA);
if ($DECODED === null) {
	header("HTTP/1.0 400 Bad Request");
	echo "Data not in json format.";
	exit();
}

if (!isset($DECODED->year))
{
	header("HTTP/1.0 400 Bad Request");
	echo "Year not found.";
	exit();
}
$YEAR = $DECODED->year;
if (intval($YEAR) !== $YEAR)
{
	header("HTTP/1.0 400 Bad Request");
	echo "Year is not numeric.";
	exit();
}
if ($YEAR < 2000 || $YEAR > 2100)
{
	header("HTTP/1.0 400 Bad Request");
	echo "Year is out of range.";
	exit();
}


$DATA_DIR = dirname(__FILE__)."/data";
$DATA_FILE = $DATA_DIR."/".$YEAR.".json";

if (is_file($DATA_FILE))
{
	header("HTTP/1.0 400 Bad Request");
	echo "Data file already exists for $YEAR.";
	exit();
}

$NOW_TIME = new DateTime("now", new DateTimeZone("Etc/UTC"));
$NEW_DATA = [
	"accounts" => [],
	"categories" => new StdClass(),
	"sequence_number" => 1,
	"last_saved" => $NOW_TIME->format("c") // ISO 8601
];

$ENCODED_DATA = json_encode($NEW_DATA, JSON_PRETTY_PRINT);

file_put_contents($DATA_FILE, $ENCODED_DATA);

header("Content-type: application/json");
echo $ENCODED_DATA;


