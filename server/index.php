<?php

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
	header("HTTP/1.0 405 Method Not Allowed");
	echo "Only GET is accepted.";
	exit();
}


$DATA_DIR = dirname(__FILE__)."/data";
chdir($DATA_DIR);
exec("find . -type f", $arrOut);
$arrFoundFiles = [];
foreach($arrOut as $testFile)
{
	if (preg_match("/^\\.\\/(2[01][0-9][0-9])\\.json$/", $testFile, $arrMatches))
	{
		$arrFoundFiles[] = intval($arrMatches[1]);
	}
}
header("Content-type: application/json");
echo json_encode(
	[
		"years" => $arrFoundFiles
	],
	JSON_PRETTY_PRINT
);


