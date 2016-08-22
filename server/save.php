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

if (!isset($DECODED->data))
{
	header("HTTP/1.0 400 Bad Request");
	echo "Data not found in JSON packet.";
	exit();
}
$DECODED_DATA = $DECODED->data;

$DATA_DIR = dirname(__DIR__);
$DATA_FILE = $DATA_DIR."/".$YEAR.".json";

$EXISTING_DATA = null;
if (is_file($DATA_FILE))
{
	$EXISTING_DATA = file_get_contents($DATA_FILE);
	if ($EXISTING_DATA !== false)
	{
		$EXISTING_DATA = json_decode($EXISTING_DATA);
	}
}
if ($EXISTING_DATA && 
	$EXISTING_DATA->sequence_number != $DECODED_DATA->sequence_number)
{
	header("HTTP/1.0 400 Bad Request");
	echo "Sequence number mismatch. On disk has ".$EXISTING_DATA->sequence_number.". Data to save has ".$DECODED_DATA->sequence_number.".";
	exit();
}

$DECODED_DATA->sequence_number += 1;
$NOW_TIME = new DateTime("now", new DateTimeZone("Etc/UTC"));
$DECODED_DATA->last_saved = $NOW_TIME->format("c"); // ISO 8601

$ENCODED_DATA = json_encode($DECODED_DATA, JSON_PRETTY_PRINT);

file_put_contents($DATA_FILE, $ENCODED_DATA);

header("Content-type: application/json");
echo $ENCODED_DATA;
